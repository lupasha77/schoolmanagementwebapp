# app/validation/schemas.py
from marshmallow import Schema, fields, validate, ValidationError

class StaffSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=2))
    subjects = fields.List(fields.Str(), required=True)
    availability = fields.Dict(
        keys=fields.Str(validate=validate.OneOf(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])),
        values=fields.List(fields.Str(validate=validate.Regexp(r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')))
    )
class StudentSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=2))
    gradeLevel= fields.Str(required=True)
     
    

class ClassSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=2))
    stream_id = fields.Str(required=True)
    practicals = fields.List(fields.Str(), required=True)

class TimeSlotSchema(Schema):
    day = fields.Str(required=True, validate=validate.OneOf(
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    ))
    start_time = fields.Str(required=True, validate=validate.Regexp(
        r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
    ))
    end_time = fields.Str(required=True, validate=validate.Regexp(
        r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
    ))
    is_break = fields.Bool(required=True)
    is_practical = fields.Bool(required=True)